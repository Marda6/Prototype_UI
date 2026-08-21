// Local ENCY UI prototype server with auto-reload.
// Serves the repository as is — same relative paths as on GitHub Pages.
//   node tools/dev-server.js        → http://localhost:5584/
//   PORT=6000 node tools/dev-server.js
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), PORT = Number(process.env.PORT) || 5584;
const TYPES = {'.html':'text/html','.css':'text/css','.js':'text/javascript',
  '.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.json':'application/json',
  '.md':'text/markdown; charset=utf-8'};
const RELOAD = '<script>(function(){try{var s=new EventSource("/__reload");' +
  's.onmessage=function(){location.reload();};}catch(e){}})();</script>';
var clients = [];

http.createServer(function(req, res){
  var url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/__reload') {
    res.writeHead(200, {'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});
    res.write('retry: 500\n\n');
    clients.push(res);
    req.on('close', function(){ var i = clients.indexOf(res); if (i >= 0) clients.splice(i, 1); });
    return;
  }
  // directory → index.html inside it
  var file = path.join(ROOT, url);
  if (url.slice(-1) === '/') file = path.join(file, 'index.html');
  else if (!path.extname(file) && fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    res.writeHead(302, {'Location': url + '/'}); res.end(); return;
  }
  fs.readFile(file, function(err, buf){
    if (err) { res.writeHead(404); res.end('not found: ' + url); return; }
    var ext = path.extname(file), body = buf;
    if (ext === '.html') body = buf.toString('utf8').replace('</body>', RELOAD + '</body>');
    res.writeHead(200, {'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control':'no-store'});
    res.end(body);
  });
}).listen(PORT, function(){
  console.log('ENCY UI prototypes: http://localhost:' + PORT + '/');
});

var timer = null;
fs.watch(ROOT, {recursive: true}, function(ev, file){
  if (!file || !/\.(html|css|js|svg)$/.test(file)) return;
  if (/dev-server\.js$/.test(file)) return;
  clearTimeout(timer);
  timer = setTimeout(function(){ clients.forEach(function(c){ c.write('data: reload\n\n'); }); }, 120);
});
