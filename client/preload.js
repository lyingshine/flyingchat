/**
 * 预加载脚本 - 在页面加载前执行
 */
window.addEventListener('DOMContentLoaded', () => {
  // 设置文档样式
  document.documentElement.style.borderRadius = '10px';
  document.body.style.borderRadius = '10px';
  
  // 给所有主要容器添加圆角
  const applyRounded = () => {
    const selectors = ['#app', '#main-container', '#loginPanel', '#registerPanel'];
    selectors.forEach(selector => {
      const element = document.querySelector(selector);
      if (element) {
        element.style.borderRadius = '10px';
        element.style.overflow = 'hidden';
      }
    });
  };
  
  // 立即应用一次
  applyRounded();
  
  // 在内容加载后再次应用
  setTimeout(applyRounded, 100);
});
