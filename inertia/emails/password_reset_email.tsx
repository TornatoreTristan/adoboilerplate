import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Heading,
  Text,
  Button,
  Hr,
} from '@react-email/components'
import type { PasswordResetEmailTranslations } from './types.js'

interface PasswordResetEmailProps {
  translations: PasswordResetEmailTranslations
  resetUrl: string
}

export default function PasswordResetEmail({ translations, resetUrl }: PasswordResetEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{translations.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{translations.heading}</Heading>

          <Text style={text}>{translations.greeting}</Text>

          <Text style={text}>{translations.body}</Text>

          <Button style={button} href={resetUrl}>
            {translations.cta}
          </Button>

          <Text style={text}>{translations.expires}</Text>

          <Hr style={hr} />

          <Text style={footer}>{translations.footer}</Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
}

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0 48px',
}

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  padding: '0 48px',
}

const button = {
  backgroundColor: '#5469d4',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px',
  margin: '27px 48px',
}

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 48px',
}

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  padding: '0 48px',
}
