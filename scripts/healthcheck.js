// Container health check (Dockerfile HEALTHCHECK and the compose files).
//
// Requests /login, a static page that needs neither a session nor the backend,
// so the check reports whether this server is up rather than whether the
// backend is. 127.0.0.1, not localhost: the server listens on 0.0.0.0 (IPv4
// only) and `localhost` can resolve to ::1 first.
const http = require('http')

const port = process.env.PORT || 3000

const request = http.get({ host: '127.0.0.1', port, path: '/login' }, (res) => {
  process.exit(res.statusCode === 200 ? 0 : 1)
})
request.on('error', () => process.exit(1))
request.setTimeout(2500, () => {
  request.destroy()
  process.exit(1)
})
