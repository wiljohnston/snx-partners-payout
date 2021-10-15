import { ChakraProvider, ColorModeScript } from '@chakra-ui/react'
import Fonts from '../components/Fonts'
import theme from '../styles/theme'

function MyApp({ Component, pageProps }) {
  return (
    <ChakraProvider>
      <Fonts />
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <Component {...pageProps} />
    </ChakraProvider>
  )
}
export default MyApp
