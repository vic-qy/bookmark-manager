<template>
  <div class="bookmark-container">
    <!-- 设置密码弹窗 -->
    <div class="modal" v-if="showSetPasswordModal">
      <div class="modal-content">
        <h2>设置访问密码</h2>
        <input
          v-model="newPassword"
          type="password"
          placeholder="请设置密码"
          class="input"
        >
        <input
          v-model="confirmPassword"
          type="password"
          placeholder="再次输入密码"
          class="input"
        >
        <button @click="setPassword" class="btn add-btn">确认设置</button>
      </div>
    </div>

    <!-- 密码验证弹窗 -->
    <div class="modal" v-if="showPasswordModal && !isAuthenticated">
      <div class="modal-content">
        <h2>请输入访问密码</h2>
        <input
          v-model="password"
          type="password"
          placeholder="输入密码"
          class="input"
          @keyup.enter="verifyPassword"
        >
        <button @click="verifyPassword" class="btn add-btn">登录</button>
      </div>
    </div>

    <!-- 核心功能区（登录后显示） -->
    <template v-if="isAuthenticated">
      <h1 class="title">📌 书签管理系统</h1>

      <!-- 添加书签表单 -->
      <div class="add-form">
        <input
          v-model="newBookmark.title"
          placeholder="输入书签标题"
          class="input"
        >
        <input
          v-model="newBookmark.url"
          placeholder="输入书签链接（需含http/https）"
          class="input"
        >
        <select v-model="newBookmark.category" class="input select">
          <option value="">选择分类</option>
          <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
          <option value="自定义">+ 自定义分类</option>
        </select>
        <input
          v-if="newBookmark.category === '自定义'"
          v-model="customCategory"
          placeholder="输入自定义分类名称"
          class="input"
        >
        <button @click="addBookmark" class="btn add-btn">添加书签</button>
      </div>

      <!-- 分类筛选 -->
      <div class="category-filter">
        <button 
          v-for="(cat, index) in ['全部', ...Array.from(new Set(bookmarks.map(b => b.category)))]"
          :key="index"
          @click="activeCategory = cat"
          :class="['filter-btn', activeCategory === cat ? 'active' : '']"
        >
          {{ cat }}
        </button>
      </div>

      <!-- 书签列表 -->
      <div class="bookmark-list">
        <div class="bookmark-card" v-for="(bookmark, index) in filteredBookmarks" :key="index">
          <div class="bookmark-info">
            <h3 class="bookmark-title">{{ bookmark.title }}</h3>
            <div class="urls-container">
              <a 
                v-for="(url, urlIndex) in bookmark.urls" 
                :key="urlIndex"
                :href="url" 
                target="_blank" 
                rel="noopener noreferrer"
                class="bookmark-link"
              >
                {{ url.slice(0, 30) }}{{ url.length > 30 ? '...' : '' }}
                <button 
                  @click.stop="removeUrl(index, urlIndex)" 
                  class="remove-url-btn"
                >
                  ×
                </button>
              </a>
            </div>
            <span class="bookmark-category">{{ bookmark.category }}</span>
          </div>
          <div class="bookmark-actions">
            <button @click="editBookmark(index)" class="btn edit-btn">编辑</button>
            <button @click="deleteBookmark(index)" class="btn delete-btn">删除</button>
          </div>
        </div>
        <div class="empty-tip" v-if="filteredBookmarks.length === 0">
          暂无书签，点击上方表单添加吧～
        </div>
      </div>

      <!-- 编辑弹窗 -->
      <div class="modal" v-if="isEditing">
        <div class="modal-content">
          <h2>编辑书签</h2>
          <input
            v-model="editingBookmark.title"
            placeholder="书签标题"
            class="input"
          >
          
          <!-- 多链接管理区域 -->
          <div class="urls-management">
            <div v-for="(url, idx) in editingBookmark.urls" :key="idx" class="url-item">
              <input
                v-model="editingBookmark.urls[idx]"
                placeholder="书签链接"
                class="input url-input"
              >
              <button 
                @click="removeEditingUrl(idx)" 
                class="btn remove-btn"
                :disabled="editingBookmark.urls.length <= 1"
              >
                删除
              </button>
            </div>
            <button @click="addNewUrlToEditing" class="btn add-url-btn">+ 添加更多链接</button>
          </div>
          
          <select v-model="editingBookmark.category" class="input select">
            <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
          </select>
          <div class="modal-btns">
            <button @click="confirmEdit" class="btn add-btn">确认修改</button>
            <button @click="isEditing = false" class="btn delete-btn">取消</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

// 密码相关状态
const isAuthenticated = ref(false)
const password = ref('')
const savedPassword = ref(localStorage.getItem('bookmarkPassword') || '')
const showPasswordModal = ref(!!savedPassword.value)
const newPassword = ref('')
const confirmPassword = ref('')
const showSetPasswordModal = ref(!savedPassword.value)

// 书签核心状态
const categories = ref(['工作', '学习', '娱乐', '生活', '工具'])
const newBookmark = ref({ title: '', url: '', category: '' })
const customCategory = ref('')
const bookmarks = ref([])
const activeCategory = ref('全部')
const isEditing = ref(false)
const editingBookmark = ref({ title: '', urls: [], category: '' })
const editIndex = ref(-1)
const invalidLinks = ref(JSON.parse(localStorage.getItem('invalidLinks') || '[]'))

// 页面加载初始化
onMounted(() => {
  try {
    // 读取书签数据 - 兼容旧数据格式
    const storedBookmarks = localStorage.getItem('bookmarks')
    if (storedBookmarks) {
      const parsed = JSON.parse(storedBookmarks)
      // 转换旧格式(单链接)到新格式(多链接数组)
      bookmarks.value = parsed.map(bookmark => {
        if (bookmark.url && !bookmark.urls) {
          return { ...bookmark, urls: [bookmark.url], url: undefined }
        }
        return bookmark
      })
    }
    
    // 读取失效链接
    const storedInvalidLinks = localStorage.getItem('invalidLinks')
    if (storedInvalidLinks) {
      invalidLinks.value = JSON.parse(storedInvalidLinks)
    }
    
    // 自动拉取最新失效链接
    try {
      fetch('/invalid-links.json')
        .then(res => {
          if (!res.ok) throw new Error('网络请求失败')
          return res.json()
        })
        .then(data => {
          if (data.length > 0) {
            localStorage.setItem('invalidLinks', JSON.stringify(data))
            invalidLinks.value = data
          }
        })
        .catch(err => console.log('获取失效链接记录失败:', err))
    } catch (err) {
      console.log('获取失效链接记录出错:', err)
    }
  } catch (err) {
    console.error('初始化时发生错误:', err)
    // 出现严重错误时重置状态，避免白屏
    isAuthenticated.value = !savedPassword.value ? false : true
    showSetPasswordModal.value = !savedPassword.value
    showPasswordModal.value = savedPassword.value && !isAuthenticated.value
  }
})

// 密码设置
const setPassword = () => {
  if (!newPassword.value || newPassword.value !== confirmPassword.value) {
    return alert('两次密码输入不一致或为空！')
  }
  localStorage.setItem('bookmarkPassword', newPassword.value)
  savedPassword.value = newPassword.value
  showSetPasswordModal.value = false
  isAuthenticated.value = true
  showPasswordModal.value = false
}

// 密码验证
const verifyPassword = () => {
  if (password.value === savedPassword.value) {
    isAuthenticated.value = true
    showPasswordModal.value = false
    // 失效链接提醒
    if (invalidLinks.value.length > 0) {
      alert(`发现 ${invalidLinks.value.length} 个失效链接：\n${invalidLinks.value.map(link => link.title + '(' + link.url + ')').join('\n')}`)
      localStorage.removeItem('invalidLinks')
      invalidLinks.value = []
    }
  } else {
    alert('密码错误，请重新输入！')
  }
  password.value = ''
}

// 保存到本地存储
const saveToLocalStorage = () => {
  try {
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks.value))
  } catch (err) {
    console.error('保存数据失败:', err)
    alert('保存失败，请稍后再试')
  }
}

// 检查链接是否已存在
const isUrlDuplicate = (url) => {
  return bookmarks.value.some(bookmark => 
    bookmark.urls && bookmark.urls.some(u => u === url)
  )
}

// 添加书签
const addBookmark = () => {
  if (!newBookmark.value.title || !newBookmark.value.url) {
    return alert('标题和链接不能为空！')
  }
  
  // 检查链接是否重复
  if (isUrlDuplicate(newBookmark.value.url)) {
    if (!confirm('该链接已存在于书签中，是否继续添加？')) {
      return
    }
  }
  
  let category = newBookmark.value.category
  if (category === '自定义' && customCategory.value) {
    category = customCategory.value
    if (!categories.value.includes(category)) {
      categories.value.push(category)
    }
  } else if (!category) {
    category = '未分类'
  }

  bookmarks.value.push({ 
    title: newBookmark.value.title, 
    urls: [newBookmark.value.url],
    category 
  })

  // 重置表单
  newBookmark.value = { title: '', url: '', category: '' }
  customCategory.value = ''
  saveToLocalStorage()
}

// 书签筛选
const filteredBookmarks = computed(() => {
  if (activeCategory.value === '全部') return bookmarks.value || []
  return (bookmarks.value || []).filter(bookmark => bookmark.category === activeCategory.value)
})

// 编辑书签
const editBookmark = (index) => {
  const bookmark = bookmarks.value[index]
  if (!bookmark) return
  
  editIndex.value = index
  editingBookmark.value = { 
    title: bookmark.title,
    urls: [...bookmark.urls],
    category: bookmark.category
  }
  isEditing.value = true
}

// 添加新链接到编辑中
const addNewUrlToEditing = () => {
  editingBookmark.value.urls.push('')
}

// 移除编辑中的链接
const removeEditingUrl = (idx) => {
  if (editingBookmark.value.urls.length <= 1) return
  editingBookmark.value.urls.splice(idx, 1)
}

// 从书签中移除链接
const removeUrl = (bookmarkIndex, urlIndex) => {
  if (!bookmarks.value[bookmarkIndex]) return
  
  if (bookmarks.value[bookmarkIndex].urls.length <= 1) {
    return alert('至少保留一个链接')
  }
  
  if (confirm('确定要删除这个链接吗？')) {
    bookmarks.value[bookmarkIndex].urls.splice(urlIndex, 1)
    saveToLocalStorage()
  }
}

// 确认编辑
const confirmEdit = () => {
  if (!editingBookmark.value.title) {
    return alert('书签标题不能为空！')
  }
  
  // 验证所有链接
  for (const url of editingBookmark.value.urls) {
    if (!url) {
      return alert('链接不能为空！')
    }
    
    // 检查新增的链接是否重复
    const originalUrls = bookmarks.value[editIndex.value].urls
    if (!originalUrls.includes(url) && isUrlDuplicate(url)) {
      if (!confirm(`链接 ${url} 已存在于其他书签中，是否继续？`)) {
        return
      }
    }
  }
  
  bookmarks.value[editIndex.value] = { ...editingBookmark.value }
  isEditing.value = false
  saveToLocalStorage()
}

// 删除书签
const deleteBookmark = (index) => {
  if (confirm('确定要删除这个书签吗？')) {
    bookmarks.value.splice(index, 1)
    saveToLocalStorage()
  }
}
</script>

<style scoped>
/* 1. 背景设置为纯白色 */
.bookmark-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Arial', sans-serif;
  background-color: #ffffff; /* 纯白色背景 */
  min-height: 100vh;
  width: 100%; /* 确保宽度自适应 */
  box-sizing: border-box; /* 确保padding不会导致溢出 */
}

.title {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 30px;
  padding: 20px 0;
}

/* 2. 优化表单自适应布局 */
.add-form {
  display: flex;
  gap: 10px;
  margin-bottom: 30px;
  flex-wrap: wrap;
  width: 100%; /* 占满容器宽度 */
}

.input {
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
  flex: 1;
  min-width: 150px; /* 减小最小宽度，增强小屏幕适应性 */
  font-size: 14px;
  background-color: white;
  box-sizing: border-box;
}

.select {
  flex: 0 0 auto; /* 自动适应内容宽度 */
  min-width: 150px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
  white-space: nowrap; /* 防止按钮文字换行 */
}

.btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.add-btn {
  background-color: #3498db;
  color: white;
}

.edit-btn {
  background-color: #f39c12;
  color: white;
  margin-right: 10px;
}

.delete-btn {
  background-color: #e74c3c;
  color: white;
}

/* 3. 优化分类筛选区域 */
.category-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
  padding: 10px;
  background-color: #f9f9f9; /* 浅灰色背景区分区域 */
  border-radius: 8px;
  width: 100%;
  box-sizing: border-box;
}

.filter-btn {
  padding: 8px 16px;
  border: 1px solid #3498db;
  border-radius: 20px;
  background: white;
  color: #3498db;
  cursor: pointer;
  transition: all 0.3s;
}

.filter-btn.active {
  background-color: #3498db;
  color: white;
}

/* 4. 优化书签列表自适应布局 */
.bookmark-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); /* 更小的最小宽度 */
  gap: 20px;
  margin-top: 20px;
  width: 100%;
  box-sizing: border-box;
}

.bookmark-card {
  background-color: white;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  transition: transform 0.3s;
}

.bookmark-card:hover {
  transform: translateY(-3px);
}

.bookmark-title {
  margin: 0;
  font-size: 18px;
  color: #2c3e50;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 10px;
}

.urls-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 10px 0;
}

.bookmark-link {
  color: #3498db;
  text-decoration: none;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background-color: #f9f9f9;
  border-radius: 4px;
  word-break: break-all;
}

.remove-url-btn {
  color: #e74c3c;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 0 5px;
  opacity: 0.7;
}

.remove-url-btn:hover {
  opacity: 1;
}

.bookmark-category {
  font-size: 12px;
  background-color: #ecf0f1;
  padding: 3px 8px;
  border-radius: 12px;
  color: #7f8c8d;
  width: fit-content;
}

.bookmark-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid #f0f0f0;
}

/* 5. 弹窗样式优化 */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.modal-content {
  background: white;
  padding: 30px;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  box-shadow: 0 5px 15px rgba(0,0,0,0.2);
  box-sizing: border-box;
}

.urls-management {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.url-item {
  display: flex;
  gap: 10px;
  align-items: center;
}

.url-input {
  flex: 1;
}

.add-url-btn {
  background-color: #2ecc71;
  color: white;
  padding: 8px 16px;
  margin-top: 5px;
}

.remove-btn {
  background-color: #e74c3c;
  color: white;
  padding: 8px 16px;
  min-width: 80px;
}

.remove-btn:disabled {
  background-color: #ec7063;
  cursor: not-allowed;
}

.modal-btns {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 10px;
}

.empty-tip {
  grid-column: 1 / -1;
  text-align: center;
  padding: 50px;
  color: #95a5a6;
  font-size: 16px;
  background-color: #f9f9f9;
  border-radius: 8px;
  margin: 20px 0;
}

/* 6. 增强响应式布局 */
@media (max-width: 1024px) {
  .bookmark-list {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }
}

@media (max-width: 768px) {
  .add-form {
    flex-direction: column;
    gap: 15px; /* 增加间距提高可读性 */
  }
  
  .input, .select {
    min-width: auto;
    width: 100%;
  }
  
  .bookmark-list {
    grid-template-columns: 1fr;
  }
  
  .category-filter {
    justify-content: flex-start;
    overflow-x: auto; /* 允许水平滚动 */
    padding-bottom: 15px;
  }
  
  .filter-btn {
    flex-shrink: 0; /* 防止按钮被压缩 */
  }
}

@media (max-width: 480px) {
  .bookmark-container {
    padding: 10px;
  }
  
  .modal-content {
    padding: 20px;
  }
  
  .bookmark-actions {
    flex-direction: column;
    gap: 8px;
  }
  
  .edit-btn, .delete-btn {
    margin-right: 0;
    width: 100%;
  }
  
  .title {
    font-size: 24px;
    padding: 10px 0;
  }
}
</style>
