import { expect, test } from 'bun:test';
import { exprToD2, parse, pureEmlTreeToD2, reduceTypes, toPureEml, toString } from '../src/index';

const EXPECTED_TAN_PURE_EML =
  'eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, eml(eml(1, eml(eml(1, eml(eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, eml(eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, eml(1, eml(eml(1, eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(1, 1))), 1))), 1))), 1)), eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(1, eml(eml(1, eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(1, eml(eml(1, eml(eml(1, eml(eml(1, 1), 1)), eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(1, 1)), 1))), 1)), 1)), 1)), 1)), 1)), 1)), 1), 1)), 1))), 1)), eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(1, eml(eml(1, x), 1)), 1)), 1)), 1), 1)), 1)), eml(eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, eml(eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, eml(1, eml(eml(1, eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(1, 1))), 1))), 1))), 1)), eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(1, eml(eml(1, eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(1, eml(eml(1, eml(eml(1, eml(eml(1, 1), 1)), eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(1, 1)), 1))), 1)), 1)), 1)), 1)), 1)), 1)), 1), 1)), 1))), 1)), eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(1, eml(eml(1, x), 1)), 1)), 1)), 1), 1)), 1), 1))), 1))), 1)), eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(1, eml(eml(1, eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(1, eml(eml(1, eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, eml(eml(1, eml(eml(1, 1), 1)), eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(1, 1)), 1))), 1))), 1)), eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(1, eml(eml(1, eml(eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, eml(1, eml(eml(1, eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(1, 1))), 1))), 1))), 1)), eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(1, eml(eml(1, eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(1, eml(eml(1, eml(eml(1, eml(eml(1, 1), 1)), eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(1, 1)), 1))), 1)), 1)), 1)), 1)), 1)), 1)), 1), 1)), 1)), 1)), 1)), 1)), 1)), 1)), 1)), 1)), 1)), 1)), 1)), 1))), 1)), eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(1, eml(eml(1, eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(1, eml(eml(1, eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, eml(eml(1, eml(eml(1, eml(eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, eml(eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, eml(1, eml(eml(1, eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(1, 1))), 1))), 1))), 1)), eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(1, eml(eml(1, eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(1, eml(eml(1, eml(eml(1, eml(eml(1, 1), 1)), eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(1, 1)), 1))), 1)), 1)), 1)), 1)), 1)), 1)), 1), 1)), 1))), 1)), eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(1, eml(eml(1, x), 1)), 1)), 1)), 1), 1)), 1)), eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, eml(eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, eml(1, eml(eml(1, eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(1, 1))), 1))), 1))), 1)), eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(1, eml(eml(1, eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(1, eml(eml(1, eml(eml(1, eml(eml(1, 1), 1)), eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(1, 1)), 1))), 1)), 1)), 1)), 1)), 1)), 1)), 1), 1)), 1))), 1)), eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(1, eml(eml(1, x), 1)), 1)), 1)), 1), 1)), 1), 1)), 1))), 1))), 1)), eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(1, eml(eml(1, eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(1, eml(eml(1, eml(eml(1, eml(eml(1, 1), 1)), eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(1, 1)), 1))), 1)), 1)), 1)), 1)), 1)), 1)), 1)), 1)), 1)), 1)), 1)), 1)), 1)), 1)';

const EXPECTED_TAN_EXPR_D2 = `direction: right

vars: {
  d2-config: {
    layout-engine: dagre
  }
}

n0: {
  label: "tan"
  shape: circle
}
n1: {
  label: "x"
  shape: rectangle
}

n0 -> n1: "arg"

eml_formula: {
  shape: text
  near: top-left
  label: |tex
    \mathrm{eml}(x,y)=\exp(x)-\ln(y)
  |
}`;

const EXPECTED_LN_PURE_EML_D2 = `direction: right

vars: {
  d2-config: {
    layout-engine: dagre
  }
}

n0: {
  label: "eml"
  shape: circle
}
n1: {
  label: "1"
  shape: rectangle
}
n2: {
  label: "eml"
  shape: circle
}
n3: {
  label: "eml"
  shape: circle
}
n4: {
  label: "1"
  shape: rectangle
}
n5: {
  label: "x"
  shape: rectangle
}
n6: {
  label: "1"
  shape: rectangle
}

n3 -> n4: "x"
n3 -> n5: "y"
n2 -> n3: "x"
n2 -> n6: "y"
n0 -> n1: "x"
n0 -> n2: "y"

eml_formula: {
  shape: text
  near: top-left
  label: |tex
    \mathrm{eml}(x,y)=\exp(x)-\ln(y)
  |
}`;

const EXPECTED_TAN_PURE_EML_COUNTS = {
  totalNodes: 1091,
  emlNodes: 545,
  xLeaves: 4,
  oneLeaves: 542,
};

function countPureEmlTree(expr: ReturnType<typeof toPureEml>) {
  let totalNodes = 0;
  let emlNodes = 0;
  let xLeaves = 0;
  let oneLeaves = 0;

  const walk = (node: typeof expr) => {
    totalNodes += 1;
    switch (node.kind) {
      case 'eml':
        emlNodes += 1;
        walk(node.left);
        walk(node.right);
        return;
      case 'var':
        if (node.name === 'x') xLeaves += 1;
        return;
      case 'num':
        if (node.value === 1) oneLeaves += 1;
        return;
      default:
        throw new Error(`Expected a pure EML tree, got ${node.kind}`);
    }
  };

  walk(expr);
  return { totalNodes, emlNodes, xLeaves, oneLeaves };
}

test('fixture: tan(x) lowers to the built-in pure eml string', () => {
  expect(toString(toPureEml(parse('tan(x)')))).toBe(EXPECTED_TAN_PURE_EML);
});

test('fixture: tan(x) pure eml tree has the built-in node counts', () => {
  expect(countPureEmlTree(toPureEml(parse('tan(x)')))).toEqual(EXPECTED_TAN_PURE_EML_COUNTS);
});

test('fixture: tan(x) exports to the built-in d2 expression tree', () => {
  expect(exprToD2(parse('tan(x)'))).toBe(EXPECTED_TAN_EXPR_D2);
});

test('fixture: ln(x) pure eml tree exports to the built-in d2 tree', () => {
  expect(pureEmlTreeToD2(reduceTypes(parse('ln(x)')))).toBe(EXPECTED_LN_PURE_EML_D2);
});
