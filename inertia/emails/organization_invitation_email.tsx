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

interface OrganizationInvitationEmailProps {
  organizationName: string
  inviterName: string
  role: string
  invitationUrl: string
  expiresAt: string
}

export default function OrganizationInvitationEmail({
  organizationName,
  inviterName,
  role,
  invitationUrl,
  expiresAt,
}: OrganizationInvitationEmailProps) {
  const getRoleLabel = (roleValue: string) => {
    switch (roleValue) {
      case 'owner':
        return 'Propriétaire'
      case 'admin':
        return 'Administrateur'
      case 'member':
        return 'Membre'
      default:
        return roleValue
    }
  }

  return (
    <Html>
      <Head />
      <Preview>
        {inviterName} vous invite à rejoindre {organizationName}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Vous êtes invité ! 🎉</Heading>

          <Text style={text}>
            <strong>{inviterName}</strong> vous invite à rejoindre l'organisation{' '}
            <strong>{organizationName}</strong> en tant que <strong>{getRoleLabel(role)}</strong>.
          </Text>

          <Button style={button} href={invitationUrl}>
            Accepter l'invitation
          </Button>

          <Text style={text}>
            Cette invitation est valable jusqu'au <strong>{expiresAt}</strong>. Si vous ne
            l'acceptez pas avant cette date, elle expirera automatiquement.
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            Si vous n'attendiez pas cette invitation ou si vous pensez qu'il s'agit d'une erreur,
            vous pouvez ignorer cet email en toute sécurité.
          </Text>
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
  marginBottom: '16px',
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
