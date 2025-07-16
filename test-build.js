// 测试 webpack 构建配置
const path = require('path');
const fs = require('fs');

console.log('🔍 检查项目配置...');

// 检查文件是否存在
const files = [
    'package.json',
    'webpack.config.js',
    'src/index.js',
    'src/nostr-client.js',
    'src/ui-manager.js',
    'src/index.html'
];

console.log('📂 检查必要文件:');
files.forEach(file => {
    const exists = fs.existsSync(path.join(__dirname, file));
    console.log(`  ${exists ? '✅' : '❌'} ${file}`);
});

// 检查 node_modules
const nodeModules = path.join(__dirname, 'node_modules');
if (fs.existsSync(nodeModules)) {
    console.log('✅ node_modules 存在');
    
    // 检查关键依赖
    const deps = [
        'nostr-tools',
        'webpack',
        'webpack-cli',
        'webpack-dev-server',
        'crypto-browserify',
        'buffer',
        'stream-browserify'
    ];
    
    console.log('📦 检查依赖:');
    deps.forEach(dep => {
        const depPath = path.join(nodeModules, dep);
        const exists = fs.existsSync(depPath);
        console.log(`  ${exists ? '✅' : '❌'} ${dep}`);
    });
} else {
    console.log('❌ node_modules 不存在');
}

// 检查 package.json 内容
try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    console.log('\n📋 项目信息:');
    console.log(`  名称: ${packageJson.name}`);
    console.log(`  版本: ${packageJson.version}`);
    console.log(`  依赖数量: ${Object.keys(packageJson.dependencies || {}).length}`);
    console.log(`  开发依赖数量: ${Object.keys(packageJson.devDependencies || {}).length}`);
    
    console.log('\n🎯 主要依赖:');
    if (packageJson.dependencies) {
        Object.entries(packageJson.dependencies).forEach(([name, version]) => {
            console.log(`  ${name}: ${version}`);
        });
    }
} catch (error) {
    console.error('❌ 无法读取 package.json:', error.message);
}

console.log('\n🚀 建议执行:');
console.log('  1. 确保在项目根目录: cd /Users/shaojunda/apps/nervina/nostr-demo');
console.log('  2. 重新安装依赖: npm install');
console.log('  3. 启动开发服务器: npm run dev');
console.log('  4. 或者使用脚本: ./start.sh');