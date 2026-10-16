import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
// En Render se puede usar una carpeta public/ o directamente la raíz del repositorio.
const publicDir = fs.existsSync(path.join(root, 'public')) ? path.join(root, 'public') : root;
const port = Number(process.env.PORT || 3000);
const sessionSecret = process.env.SESSION_SECRET || 'cambia-esta-clave-en-produccion';
const allowedEmails = (process.env.ALLOWED_EMAILS || 'andrea.leganes@luis-simoes.com,javier.fernandez@luis-simoes.com').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
const usersFile = path.join(root, 'users.json');

function hash(value, salt = crypto.randomBytes(16).toString('hex')) {
  return `${salt}:${crypto.scryptSync(value, salt, 64).toString('hex')}`;
}
function check(value, stored) {
  const [salt, digest] = String(stored).split(':');
  if (!salt || !digest) return false;
  const actual = crypto.scryptSync(value, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(digest));
}
function readUsers() {
  try { return JSON.parse(fs.readFileSync(usersFile, 'utf8')); } catch { return {}; }
}
function saveUsers(users) { fs.writeFileSync(usersFile, JSON.stringify(users, null, 2)); }
function token(email) { return `${email}.${crypto.createHmac('sha256', sessionSecret).update(email).digest('hex')}`; }
function validSession(req) {
  const raw = req.headers.cookie?.match(/(?:^|; )session=([^;]+)/)?.[1];
  if (!raw) return null;
  const [email, sig] = decodeURIComponent(raw).split('.');
  return email && sig === token(email).split('.')[1] && allowedEmails.includes(email) ? email : null;
}
function send(res, status, type, body, headers = {}) { res.writeHead(status, { 'Content-Type': type, ...headers }); res.end(body); }
const login = `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Acceso · Albaranes</title><style>body{font-family:Arial,sans-serif;background:#f3f5f8;display:grid;place-items:center;min-height:100vh;margin:0}.card{background:#fff;padding:32px;border-radius:14px;box-shadow:0 8px 30px #0002;width:min(390px,calc(100% - 40px))}h1{margin-top:0;color:#111}label{display:block;margin:14px 0 6px;font-weight:bold}input{box-sizing:border-box;width:100%;padding:12px;border:1px solid #bbb;border-radius:8px;font-size:16px}button{margin-top:20px;width:100%;padding:12px;border:0;border-radius:8px;background:#111;color:#fff;font-size:16px;cursor:pointer}.error{color:#b00020;margin-top:14px}</style><div class="card"><h1>Albaranes</h1><p>Acceso para personal autorizado</p><form method="post" action="/login"><label>Correo autorizado</label><input name="email" type="email" required><label>Contraseña</label><input name="password" type="password" required><button>Entrar</button></form><div class="error" id="error"></div></div></html>`;
function parseForm(req) { return new Promise(resolve => { let b=''; req.on('data', c => b += c); req.on('end', () => resolve(new URLSearchParams(b))); }); }

const server = http.createServer(async (req, res) => {
  const email = validSession(req);
  if (req.method === 'POST' && req.url === '/login') {
    const form = await parseForm(req); const user = String(form.get('email') || '').toLowerCase().trim(); const pass = String(form.get('password') || '');
    const users = readUsers();
    if (allowedEmails.includes(user) && users[user] && check(pass, users[user].passwordHash)) {
      send(res, 302, 'text/plain', '', { Location: '/', 'Set-Cookie': `session=${encodeURIComponent(token(user))}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800` });
    } else send(res, 401, 'text/html; charset=utf-8', login.replace('<div class="error" id="error"></div>', '<div class="error">Correo o contraseña incorrectos</div>'));
    return;
  }
  if (req.url === '/logout') { send(res, 302, 'text/plain', '', { Location: '/login', 'Set-Cookie': 'session=; Max-Age=0; Path=/' }); return; }
  if (!email) { send(res, 200, 'text/html; charset=utf-8', login); return; }
  let requested = decodeURIComponent(req.url.split('?')[0]); if (requested === '/') requested = '/index.html';
  const file = path.resolve(publicDir, '.' + requested);
  if (!file.startsWith(path.resolve(publicDir)) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { send(res, 404, 'text/plain', 'No encontrado'); return; }
  const types = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.json':'application/json' };
  send(res, 200, types[path.extname(file)] || 'application/octet-stream', fs.readFileSync(file), { 'Cache-Control': 'no-store' });
});

// Sincroniza los usuarios autorizados al arrancar. Esto evita que una primera
// ejecución sin variables de entorno deje un users.json vacío en Render.
if (!process.env.ADMIN_PASSWORD) {
  console.warn('Define ADMIN_PASSWORD antes de arrancar para crear usuarios.');
} else {
  const users = readUsers();
  for (const email of allowedEmails) {
    if (!users[email] || !check(process.env.ADMIN_PASSWORD, users[email].passwordHash)) {
      users[email] = { passwordHash: hash(process.env.ADMIN_PASSWORD), updatedAt: new Date().toISOString() };
    }
  }
  saveUsers(users);
}
server.listen(port, () => console.log(`Albaranes seguro en http://localhost:${port}`));
