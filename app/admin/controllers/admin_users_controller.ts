import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import UserRepository from '#users/repositories/user_repository'
import AdminService from '#admin/services/admin_service'
import UserService from '#users/services/user_service'
import AuditLogService from '#audit/services/audit_log_service'
import { updateUserValidator } from '#admin/validators/update_user_validator'
import { AdminUserDto } from '#admin/presenters/admin_user_dto'
import { asInertiaProps } from '#shared/types/inertia_props'

@inject()
export default class AdminUsersController {
  constructor(
    private userRepository: UserRepository,
    private adminService: AdminService,
    private userService: UserService,
    private auditLogService: AuditLogService
  ) {}

  async users({ request, inertia }: HttpContext) {
    const page = Number(request.input('page', 1)) || 1
    const perPage = Number(request.input('perPage', 20)) || 20
    const search = (request.input('search', '') as string).trim() || undefined
    const dateFrom = (request.input('dateFrom', '') as string) || undefined
    const dateTo = (request.input('dateTo', '') as string) || undefined

    const { data, meta } = await this.adminService.getUsersWithLastActivity({
      page,
      perPage,
      search,
      dateFrom,
      dateTo,
    })

    return inertia.render(
      'admin/users',
      asInertiaProps({
        users: data.map((user) => AdminUserDto.presentListItem(user)),
        meta,
        filters: { search: search ?? '', dateFrom: dateFrom ?? '', dateTo: dateTo ?? '' },
      })
    )
  }

  async userDetail({ params, inertia }: HttpContext) {
    const user = await this.userRepository.findByIdOrFail(params.id)
    const sessions = await this.adminService.getUserSessions(params.id)
    const auditLogs = await this.auditLogService.getUserLogs(params.id, 50)

    return inertia.render(
      'admin/user-detail',
      asInertiaProps({
        user: AdminUserDto.presentDetail(user),
        sessions: sessions.map((session) => AdminUserDto.presentSession(session)),
        auditLogs: auditLogs.map((log) => AdminUserDto.presentAuditLog(log)),
      })
    )
  }

  async updateUser({ params, request, response, session, i18n }: HttpContext) {
    const data = await request.validateUsing(updateUserValidator)

    await this.userService.updateAdmin(params.id, data)

    session.flash('success', i18n.t('admin.flash.user_updated'))
    return response.redirect().back()
  }
}
