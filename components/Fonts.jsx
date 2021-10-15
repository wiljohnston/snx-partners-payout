import { Global } from "@emotion/react";

const Fonts = () => (
  <Global
    styles={`
      /* latin */
      @font-face {
        font-family: 'GT America';
        font-style: normal;
        font-weight: 700;
        src: url('./fonts/GT-America-Expanded-Black.woff2') format('woff2');
      }
      /* latin */
      @font-face {
        font-family: 'GT America';
        font-style: normal;
        font-weight: 400;
        src: url('./fonts/GT-America-Condensed-Bold.woff2') format('woff2');
      }
      `}
  />
);

export default Fonts;
