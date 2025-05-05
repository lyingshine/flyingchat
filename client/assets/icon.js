// 生成PNG图标文件
const fs = require('fs');
const path = require('path');

// 创建一个简单的SVG图标 - 微信风格的聊天图标
const createIcon = () => {
  const svgContent = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
    <rect width="24" height="24" rx="4" fill="#07C160"/>
    <path d="M6.5,9.5 C6.5,8.672 7.172,8 8,8 C8.828,8 9.5,8.672 9.5,9.5 C9.5,10.328 8.828,11 8,11 C7.172,11 6.5,10.328 6.5,9.5 Z" fill="white"/>
    <path d="M14.5,9.5 C14.5,8.672 15.172,8 16,8 C16.828,8 17.5,8.672 17.5,9.5 C17.5,10.328 16.828,11 16,11 C15.172,11 14.5,10.328 14.5,9.5 Z" fill="white"/>
    <path d="M4,7 C4,5.343 5.343,4 7,4 L17,4 C18.657,4 20,5.343 20,7 L20,14 C20,15.657 18.657,17 17,17 L14.5,17 L12,20 L9.5,17 L7,17 C5.343,17 4,15.657 4,14 L4,7 Z" stroke="white" stroke-width="1.5" fill="none"/>
  </svg>
  `;

  // 保存SVG文件
  const svgPath = path.join(__dirname, 'icon.svg');
  fs.writeFileSync(svgPath, svgContent);
  console.log('图标文件已创建:', svgPath);

  // 简单的PNG转换 (这里只是一个基本示例)
  // 在实际应用中你可能需要使用一个专门的库来转换SVG到PNG
  const pngPath = path.join(__dirname, 'icon.png');
  fs.writeFileSync(pngPath, svgContent);
  console.log('图标文件已创建:', pngPath);
}

createIcon(); 