import { BlockAttributes } from "block-attributes";
import produce from "immer";
import { findIntroducedSymbols } from "literate-elm";
import { AttributeDerivatives, BlockOutputFormat, OutputFormat } from "./types";

let unusedAutogeneratedContextId = 0;
export function extractAttributeDerivatives(
  attributes: Readonly<BlockAttributes>,
): AttributeDerivatives | null {
  const attributesWithMixIns = { ...attributes };
  if (attributesWithMixIns.s === true || attributesWithMixIns.siding === true) {
    attributesWithMixIns.isolated = true;
    attributesWithMixIns.follows = "default";
  }
  if (attributesWithMixIns.isolated) {
    attributesWithMixIns.context = `_autogenerated__${unusedAutogeneratedContextId}`;
    unusedAutogeneratedContextId += 1;
  }

  const result: AttributeDerivatives = {
    contextName:
      typeof attributesWithMixIns.context !== "undefined"
        ? normalizeExpression(attributesWithMixIns.context)
        : "default",
    outputFormats: [],
    outputExpressionsByFormat: {},
    id: attributesWithMixIns.id,
    follows: attributesWithMixIns.follows,
  };

  let isLitVis = false;
  for (const key in attributesWithMixIns) {
    if (attributesWithMixIns.hasOwnProperty(key)) {
      const value = attributesWithMixIns[key];
      switch (key) {
        case "l":
        case "literate":
          if (value === false) {
            return null;
          }
          isLitVis = true;
          if (value !== "hidden" && attributesWithMixIns["hide"] !== true) {
            result.outputFormats.push(BlockOutputFormat.L);
          }
          break;
        case "v":
        case "visualize":
          isLitVis = true;
          addOutputExpressions(result, OutputFormat.V, value);
          break;
        case "r":
        case "raw":
          isLitVis = true;
          addOutputExpressions(result, OutputFormat.R, value);
          break;
        case "j":
        case "json":
          isLitVis = true;
          addOutputExpressions(result, OutputFormat.J, value);
          break;
        case "interactive":
          result.interactive = !!value;
          break;
      }
    }
  }
  if (isLitVis) {
    return result;
  }
  return null;
}

/**
 * Looks through outputExpressionsByFormat and replaces true (i.e. auto)
 * with a lists of symbols introduced in the code block.
 * Returns a new object if any changes.
 * @param derivatives
 * @param code
 */
export function resolveExpressions(
  derivatives: Readonly<AttributeDerivatives>,
  code: string,
) {
  const introducedSymbols = findIntroducedSymbols(code);
  const introducedNames = introducedSymbols.map((s) => s.name);
  return produce(derivatives, (draft: AttributeDerivatives) => {
    draft.outputFormats.forEach((referenceFormat) => {
      if (
        referenceFormat !== BlockOutputFormat.L &&
        !draft.outputExpressionsByFormat[referenceFormat]
      ) {
        draft.outputExpressionsByFormat[referenceFormat] = introducedNames;
      }
    });
  });
}

function normalizeExpression(value) {
  return `${value}`.trim();
}

function addOutputExpressions(
  derivatives: AttributeDerivatives,
  type: OutputFormat,
  value,
) {
  const expressionsToAdd: string[] = [];
  if (value instanceof Array) {
    value.forEach((v) => {
      expressionsToAdd.push(normalizeExpression(v));
    });
  } else if (value !== true) {
    expressionsToAdd.push(normalizeExpression(value));
  }
  if (expressionsToAdd.length || value === true) {
    derivatives.outputFormats.push((type as any) as BlockOutputFormat);
  }
  if (expressionsToAdd.length) {
    derivatives.outputExpressionsByFormat[type] = expressionsToAdd;
  }
}