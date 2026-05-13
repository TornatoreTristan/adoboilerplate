import router from '@adonisjs/core/services/router'

const OpenApiController = () => import('#api/controllers/openapi_controller')

router.get('/api/docs', [OpenApiController, 'docs']).as('api.docs')
router.get('/api/v1/openapi.json', [OpenApiController, 'spec']).as('api.openapi.spec')
