import { parseDocument } from "./parse/stylesheet";

export default function init(): void {
  parseDocument(document);
}
