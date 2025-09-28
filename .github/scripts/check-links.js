const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 从localStorage备份文件读取书签（需手动导出bookmarks到项目根目录）
const getBookmarks = async () => {
  try {
    const bookmarksPath = path.resolve(__dirname, '../../../bookmarks-backup.json');
    if (!fs.existsSync(bookmarksPath)) {
      console.error('未找到书签备份文件，请先导出localStorage中的bookmarks数据');
      return [];
    }
    const data = fs.readFileSync(bookmarksPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('读取书签数据失败：', err);
    return [];
  }
};

// 检测单个链接有效性
const checkLink = async (bookmark) => {
  try {
    const response = await axios.head(bookmark.url, {
      timeout: 10000,
      validateStatus: (status) => status >= 200 && status < 400
    });
    return { ...bookmark, valid: true };
  } catch (err) {
    console.error(`链接失效：${bookmark.title}(${bookmark.url})`);
    return { ...bookmark, valid: false };
  }
};

// 批量检测并生成失效链接文件
const checkAllLinks = async () => {
  const bookmarks = await getBookmarks();
  if (bookmarks.length === 0) return;

  const checkResults = await Promise.all(bookmarks.map(checkLink));
  const invalidLinks = checkResults.filter(item => !item.valid);

  // 保存到项目根目录
  const resultPath = path.resolve(__dirname, '../../../invalid-links.json');
  fs.writeFileSync(resultPath, JSON.stringify(invalidLinks, null, 2), 'utf8');
  
  // 同时保存到public目录，确保部署后可访问
  const publicPath = path.resolve(__dirname, '../../../public/invalid-links.json');
  fs.writeFileSync(publicPath, JSON.stringify(invalidLinks, null, 2), 'utf8');
  
  console.log(`检测完成，共发现 ${invalidLinks.length} 个失效链接`);
};

checkAllLinks();
