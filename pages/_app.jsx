import { ChakraProvider, ColorModeScript } from '@chakra-ui/react'
import Fonts from '../components/fonts'
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
