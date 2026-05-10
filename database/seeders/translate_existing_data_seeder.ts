import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Plan from '#billing/models/plan'
import Organization from '#organizations/models/organization'

export default class extends BaseSeeder {
  async run() {
    // Traduire les plans existants
    const plans = await Plan.all()

    for (const plan of plans) {
      // Si le plan a déjà les mêmes traductions FR/EN, on les traduit
      if (plan.nameI18n && plan.nameI18n.fr === plan.nameI18n.en) {
        const translations: Record<
          string,
          { en: string; description?: string; features?: string }
        > = {
          Starter: {
            en: 'Starter',
            description: 'Perfect for getting started',
            features: '1 user, Email support, 5GB storage',
          },
          Pro: {
            en: 'Pro',
            description: 'For growing teams',
            features: '10 users, Priority support, 50GB storage, API access',
          },
          Enterprise: {
            en: 'Enterprise',
            description: 'For large organizations',
            features:
              'Unlimited users, 24/7 support, Unlimited storage, API access, Custom integrations',
          },
          Gratuit: {
            en: 'Free',
            description: 'Free forever plan',
            features: 'Basic features, Community support',
          },
        }

        const frName = plan.nameI18n.fr
        const translation = translations[frName]

        if (translation) {
          plan.nameI18n = {
            fr: frName,
            en: translation.en,
          }

          if (plan.descriptionI18n && translation.description) {
            plan.descriptionI18n = {
              fr: plan.descriptionI18n.fr || '',
              en: translation.description,
            }
          }

          if (plan.featuresI18n && translation.features) {
            plan.featuresI18n = {
              fr: plan.featuresI18n.fr || '',
              en: translation.features,
            }
          }

          await plan.save()
          console.log(`✅ Plan "${frName}" traduit en anglais`)
        }
      }
    }

    // Traduire les organizations existantes
    const organizations = await Organization.all()

    for (const org of organizations) {
      if (org.descriptionI18n && org.descriptionI18n.fr === org.descriptionI18n.en) {
        org.descriptionI18n = {
          fr: org.descriptionI18n.fr || '',
          en: `Organization description for ${org.name}`,
        }
        await org.save()
        console.log(`✅ Organization "${org.name}" traduite en anglais`)
      }
    }

    console.log('✅ Traductions terminées!')
  }
}
