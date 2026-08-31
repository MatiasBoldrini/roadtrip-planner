export const theme = {
  kind: "light",
  text: {
    primary: "#171717",
    secondary: "#5c5c5c",
    tertiary: "#8a8a8a",
    quaternary: "#b0b0b0",
    onAccent: "#ffffff",
    link: "#2563a8",
  },
  bg: {
    editor: "#ffffff",
    chrome: "#f5f5f5",
    elevated: "#ffffff",
  },
  fill: {
    primary: "#f4f4f4",
    secondary: "#f0f0f0",
    tertiary: "#e8e8e8",
    quaternary: "#dedede",
  },
  stroke: {
    primary: "#cfcfcf",
    secondary: "#e5e5e5",
    tertiary: "#efefef",
    focused: "#d9843a",
  },
  accent: {
    primary: "#3d6b9e",
    control: "#3d6b9e",
    controlHover: "#335a85",
  },
  category: {
    orange: "#d9843a",
  },
} as const;

export type HostTheme = typeof theme;

export function rideTint(amount: number) {
  return `color-mix(in srgb, ${theme.category.orange} ${amount}%, ${theme.bg.elevated})`;
}
