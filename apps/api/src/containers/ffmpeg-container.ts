import { Container } from "@cloudflare/containers";

export class FFmpegContainer extends Container {
  defaultPort = 8080;
  sleepAfter = "5m";
}
