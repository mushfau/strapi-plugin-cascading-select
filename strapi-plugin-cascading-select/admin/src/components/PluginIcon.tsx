import styled from 'styled-components';

// Path of the `Filter` glyph from @strapi/icons (32×32 viewBox).
const FILTER_PATH =
  'M25.5 16a1.5 1.5 0 0 1-1.5 1.5H8a1.5 1.5 0 1 1 0-3h16a1.5 1.5 0 0 1 1.5 1.5M29 8.5H3a1.5 1.5 0 0 0 0 3h26a1.5 1.5 0 1 0 0-3m-10 12h-6a1.5 1.5 0 1 0 0 3h6a1.5 1.5 0 1 0 0-3';

/**
 * Field-type tile like the built-in Content-Type Builder symbols (32×24), drawn with theme
 * colors so it follows the light and dark themes.
 */
const Symbol = styled.svg`
  rect {
    fill: ${({ theme }) => theme.colors.primary100};
    stroke: ${({ theme }) => theme.colors.primary200};
  }

  path {
    fill: ${({ theme }) => theme.colors.primary600};
  }
`;

const PluginIcon = () => (
  <Symbol xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 24" aria-hidden>
    <rect x="0.5" y="0.5" width="31" height="23" rx="2.5" />
    <path d={FILTER_PATH} transform="translate(8 4) scale(0.5)" />
  </Symbol>
);

export { PluginIcon };
