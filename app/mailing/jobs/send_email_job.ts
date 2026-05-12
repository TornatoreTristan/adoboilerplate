import type { Job } from 'bull'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type EmailService from '#mailing/services/email_service'
import type { SendEmailData } from '#mailing/types/email'
import { E } from '#shared/exceptions/exception_helpers'
import logger from '@adonisjs/core/services/logger'

export interface SendEmailJobData {
  emailData: SendEmailData
}

export async function sendEmailJob(job: Job<SendEmailJobData>): Promise<void> {
  const { emailData } = job.data

  logger.info(`[SendEmailJob] Processing email to ${emailData.to}`)

  try {
    const emailService = getService<EmailService>(TYPES.EmailService)
    const result = await emailService.send(emailData)

    if (!result.success) {
      logger.error(`[SendEmailJob] Failed to send email: ${result.error}`)
      E.internal(result.error || 'Email send failed')
    }

    logger.info(`[SendEmailJob] Email sent successfully. ID: ${result.id}`)
  } catch (error) {
    logger.error(`[SendEmailJob] Error: ${error.message}`)
    throw error
  }
}

export default sendEmailJob
