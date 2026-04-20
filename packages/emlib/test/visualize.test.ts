import { expect, test } from 'bun:test';
import { exprToD2, parse, reduceTypes, toPureEml, toString } from '../src/index';

const EXPECTED_TAN_PURE_EML = 'E(E(E(1,E(E(1,E(1,E(E(1,E(E(E(1,E(E(1,E(1,E(E(1,E(E(1,E(E(1,E(E(E(E(1,E(E(1,E(1,E(E(1,E(E(E(E(1,E(E(1,E(1,E(E(1,E(1,E(E(1,E(E(1,E(E(1,E(1,E(E(1,1),1))),1)),E(1,1))),1))),1))),1)),E(E(E(1,E(E(1,E(1,E(E(1,1),1))),1)),E(E(1,E(E(1,E(E(E(1,E(E(1,E(1,E(E(1,1),1))),1)),E(E(1,E(E(1,E(E(1,E(E(1,1),1)),E(E(E(1,E(E(1,E(1,E(E(1,1),1))),1)),E(1,1)),1))),1)),1)),1)),1)),1)),1)),1),1)),1))),1)),E(E(E(1,E(E(1,E(1,E(E(1,1),1))),1)),E(E(1,E(E(1,x),1)),1)),1)),1),1)),1)),E(E(E(E(1,E(E(1,E(1,E(E(1,1),1))),1)),E(E(E(E(1,E(E(1,E(1,E(E(1,E(E(E(E(1,E(E(1,E(1,E(E(1,E(1,E(E(1,E(E(1,E(E(1,E(1,E(E(1,1),1))),1)),E(1,1))),1))),1))),1)),E(E(E(1,E(E(1,E(1,E(E(1,1),1))),1)),E(E(1,E(E(1,E(E(E(1,E(E(1,E(1,E(E(1,1),1))),1)),E(E(1,E(E(1,E(E(1,E(E(1,1),1)),E(E(E(1,E(E(1,E(1,E(E(1,1),1))),1)),E(1,1)),1))),1)),1)),1)),1)),1)),1)),1),1)),1))),1)),E(E(E(1,E(E(1,E(1,E(E(1,1),1))),1)),E(E(1,E(E(1,x),1)),1)),1)),1),1)),1),1))),1))),1)),E(E(E(1,E(E(1,E(1,E(E(1,1),1))),1)),E(E(1,E(E(1,E(E(E(1,E(E(1,E(1,E(E(1,1),1))),1)),E(E(1,E(E(1,E(E(E(1,E(E(1,E(1,E(E(1,E(E(1,E(E(1,1),1)),E(E(E(1,E(E(1,E(1,E(E(1,1),1))),1)),E(1,1)),1))),1))),1)),E(E(E(1,E(E(1,E(1,E(E(1,1),1))),1)),E(E(1,E(E(1,E(E(E(E(1,E(E(1,E(1,E(E(1,E(1,E(E(1,E(E(1,E(E(1,E(1,E(E(1,1),1))),1)),E(1,1))),1))),1))),1)),E(E(E(1,E(E(1,E(1,E(E(1,1),1))),1)),E(E(1,E(E(1,E(E(E(1,E(E(1,E(1,E(E(1,1),1))),1)),E(E(1,E(E(1,E(E(1,E(E(1,1),1)),E(E(E(1,E(E(1,E(1,E(E(1,1),1))),1)),E(1,1)),1))),1)),1)),1)),1)),1)),1)),1),1)),1)),1)),1)),1)),1)),1)),1)),1)),1)),1)),1)),1))),1)),E(E(E(1,E(E(1,E(1,E(E(1,1),1))),1)),E(E(1,E(E(1,E(E(E(1,E(E(1,E(1,E(E(1,1),1))),1)),E(E(1,E(E(1,E(E(E(1,E(E(1,E(1,E(E(1,E(E(1,E(E(1,E(E(E(E(1,E(E(1,E(1,E(E(1,E(E(E(E(1,E(E(1,E(1,E(E(1,E(1,E(E(1,E(E(1,E(E(1,E(1,E(E(1,1),1))),1)),E(1,1))),1))),1))),1)),E(E(E(1,E(E(1,E(1,E(E(1,1),1))),1)),E(E(1,E(E(1,E(E(E(1,E(E(1,E(1,E(E(1,1),1))),1)),E(E(1,E(E(1,E(E(1,E(E(1,1),1)),E(E(E(1,E(E(1,E(1,E(E(1,1),1))),1)),E(1,1)),1))),1)),1)),1)),1)),1)),1)),1),1)),1))),1)),E(E(E(1,E(E(1,E(1,E(E(1,1),1))),1)),E(E(1,E(E(1,x),1)),1)),1)),1),1)),1)),E(E(E(1,E(E(1,E(1,E(E(1,1),1))),1)),E(E(E(E(1,E(E(1,E(1,E(E(1,1),1))),1)),E(E(E(E(1,E(E(1,E(1,E(E(1,E(E(E(E(1,E(E(1,E(1,E(E(1,E(1,E(E(1,E(E(1,E(E(1,E(1,E(E(1,1),1))),1)),E(1,1))),1))),1))),1)),E(E(E(1,E(E(1,E(1,E(E(1,1),1))),1)),E(E(1,E(E(1,E(E(E(1,E(E(1,E(1,E(E(1,1),1))),1)),E(E(1,E(E(1,E(E(1,E(E(1,1),1)),E(E(E(1,E(E(1,E(1,E(E(1,1),1))),1)),E(1,1)),1))),1)),1)),1)),1)),1)),1)),1),1)),1))),1)),E(E(E(1,E(E(1,E(1,E(E(1,1),1))),1)),E(E(1,E(E(1,x),1)),1)),1)),1),1)),1),1)),1))),1))),1)),E(E(E(1,E(E(1,E(1,E(E(1,1),1))),1)),E(E(1,E(E(1,E(E(E(1,E(E(1,E(1,E(E(1,1),1))),1)),E(E(1,E(E(1,E(E(1,E(E(1,1),1)),E(E(E(1,E(E(1,E(1,E(E(1,1),1))),1)),E(1,1)),1))),1)),1)),1)),1)),1)),1)),1)),1)),1)),1)),1)),1)),1)),1)';

const EXPECTED_TAN_EXPR_D2 = `classes: {
  function: {
    shape: circle
    style: {
      fill-pattern: none
    }
  }
  variable: {
    shape: square
    style: {
      fill-pattern: lines
    }
  }
  constant: {
    shape: square
    style: {
      fill-pattern: dots
    }
  }
}

n0: {
  label: "tan"
  class: function
}
n1: {
  label: "x"
  class: variable
}

n0 -> n1: "arg"`;

const EXPECTED_LN_PURE_EML_D2 = `classes: {
  function: {
    shape: circle
    style: {
      fill-pattern: none
    }
  }
  variable: {
    shape: square
    style: {
      fill-pattern: lines
    }
  }
  constant: {
    shape: square
    style: {
      fill-pattern: dots
    }
  }
}

n0: {
  label: "eml"
  class: function
}
n1: {
  label: "1"
  class: constant
}
n2: {
  label: "eml"
  class: function
}
n3: {
  label: "eml"
  class: function
}
n4: {
  label: "1"
  class: constant
}
n5: {
  label: "x"
  class: variable
}
n6: {
  label: "1"
  class: constant
}

n3 -> n4: "x"
n3 -> n5: "y"
n2 -> n3: "x"
n2 -> n6: "y"
n0 -> n1: "x"
n0 -> n2: "y"`;

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

test('exprToD2 exports the shared three-class visualization', () => {
  const d2 = exprToD2(parse('exp(x) - ln(y)'));
  expect(d2).toContain('classes: {');
  expect(d2).toContain('  function: {');
  expect(d2).toContain('  variable: {');
  expect(d2).toContain('  constant: {');
  expect(d2).toContain('shape: circle');
  expect(d2).toContain('fill-pattern: none');
  expect(d2).toContain('fill-pattern: lines');
  expect(d2).toContain('fill-pattern: dots');
  expect(d2).toContain('label: "-"');
  expect(d2).toContain('label: "exp"');
  expect(d2).toContain('label: "ln"');
  expect(d2).toContain('label: "x"');
  expect(d2).toContain('label: "y"');
  expect(d2).toContain('class: function');
  expect(d2).toContain('class: variable');
});

test('fixture: tan(x) exports to the built-in d2 expression tree', () => {
  expect(exprToD2(parse('tan(x)'))).toBe(EXPECTED_TAN_EXPR_D2);
});

test('fixture: ln(x) reduced tree exports to the generic d2 tree', () => {
  expect(exprToD2(reduceTypes(parse('ln(x)')))).toBe(EXPECTED_LN_PURE_EML_D2);
});
