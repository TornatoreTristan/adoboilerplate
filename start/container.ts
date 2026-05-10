/**
 * Initialisation du container IoC au démarrage de l'application
 */
import { serviceContainer } from '#shared/container/container'

// Le container est configuré et prêt à être utilisé
export { serviceContainer as container }
export default serviceContainer
