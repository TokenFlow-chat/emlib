import type { DiagramSource } from "@/features/eml-playground/constants";
import type { MessageDictionary } from "@/i18n/schema";

type PlaygroundMessages = MessageDictionary["playground"];

export function getTransformCopy(playground: PlaygroundMessages, source: DiagramSource) {
  switch (source) {
    case "standard":
      return playground.transforms.standard;
    case "pure":
      return playground.transforms.pure;
    case "shortest":
      return playground.transforms.shortest;
    case "lifted":
      return playground.transforms.lifted;
  }
}
