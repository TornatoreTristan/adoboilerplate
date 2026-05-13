import type { HttpContext } from '@adonisjs/core/http'
import { openApiSpec } from '#api/openapi/spec'

const DOCS_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Adoboilerplate API — Reference</title>
    <style>body { margin: 0; }</style>
  </head>
  <body>
    <script
      id="api-reference"
      data-url="/api/v1/openapi.json"
      data-configuration='{"theme":"default","layout":"modern","hideDownloadButton":false}'
    ></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`

export default class OpenApiController {
  spec({ response }: HttpContext) {
    response.header('Cache-Control', 'public, max-age=300')
    return response.json(openApiSpec)
  }

  docs({ response }: HttpContext) {
    response.header('Content-Type', 'text/html; charset=utf-8')
    response.header('Cache-Control', 'public, max-age=300')
    response.header(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' https://cdn.jsdelivr.net",
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.bunny.net",
        "font-src 'self' data: https://cdn.jsdelivr.net https://fonts.bunny.net",
        "img-src 'self' data: https:",
        "connect-src 'self'",
      ].join('; ')
    )
    return response.send(DOCS_HTML)
  }
}
