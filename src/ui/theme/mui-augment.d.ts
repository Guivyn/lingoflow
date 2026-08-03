import "@mui/material/styles";

declare module "@mui/material/styles" {
  interface Palette {
    surface: string;
    surfaceMuted: string;
    surfaceRaised: string;
    border: string;
    borderStrong: string;
  }

  interface PaletteOptions {
    surface?: string;
    surfaceMuted?: string;
    surfaceRaised?: string;
    border?: string;
    borderStrong?: string;
  }
}
