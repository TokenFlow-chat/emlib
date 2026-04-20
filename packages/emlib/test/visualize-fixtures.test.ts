import { expect, test } from 'bun:test';
import { exprToD2, parse, pureEmlTreeToD2, reduceTypes, toPureEml, toString } from '../src/index';

const EXPECTED_TAN_PURE_EML =
  'eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, eml(eml(1, eml(eml(1, eml(eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, eml(eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, eml(1, eml(eml(1, eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(1, 1))), 1))), 1))), 1)), eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(1, eml(eml(1, eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(1, eml(eml(1, eml(eml(1, eml(eml(1, 1), 1)), eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(1, 1)), 1))), 1)), 1)), 1)), 1)), 1)), 1)), 1), 1)), 1))), 1)), eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(1, eml(eml(1, x), 1)), 1)), 1)), 1), 1)), 1)), eml(eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, eml(eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, eml(1, eml(eml(1, eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(1, 1))), 1))), 1))), 1)), eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(1, eml(eml(1, eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(1, eml(eml(1, eml(eml(1, eml(eml(1, 1), 1)), eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(1, 1)), 1))), 1)), 1)), 1)), 1)), 1)), 1)), 1), 1)), 1))), 1)), eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(1, eml(eml(1, x), 1)), 1)), 1)), 1), 1)), 1), 1))), 1))), 1)), eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(1, eml(eml(1, eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(1, eml(eml(1, eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, eml(eml(1, eml(eml(1, 1), 1)), eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(1, 1)), 1))), 1))), 1)), eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(1, eml(eml(1, eml(eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, eml(1, eml(eml(1, eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(1, 1))), 1))), 1))), 1)), eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(1, eml(eml(1, eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(1, eml(eml(1, eml(eml(1, eml(eml(1, 1), 1)), eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(1, 1)), 1))), 1)), 1)), 1)), 1)), 1)), 1)), 1), 1)), 1)), 1)), 1)), 1)), 1)), 1)), 1)), 1)), 1)), 1)), 1)), 1))), 1)), eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(1, eml(eml(1, eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(1, eml(eml(1, eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, eml(eml(1, eml(eml(1, eml(eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, eml(eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, eml(1, eml(eml(1, eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(1, 1))), 1))), 1))), 1)), eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(1, eml(eml(1, eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(1, eml(eml(1, eml(eml(1, eml(eml(1, 1), 1)), eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(1, 1)), 1))), 1)), 1)), 1)), 1)), 1)), 1)), 1), 1)), 1))), 1)), eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(1, eml(eml(1, x), 1)), 1)), 1)), 1), 1)), 1)), eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, eml(eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, eml(1, eml(eml(1, eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(1, 1))), 1))), 1))), 1)), eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(1, eml(eml(1, eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(1, eml(eml(1, eml(eml(1, eml(eml(1, 1), 1)), eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(1, 1)), 1))), 1)), 1)), 1)), 1)), 1)), 1)), 1), 1)), 1))), 1)), eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(1, eml(eml(1, x), 1)), 1)), 1)), 1), 1)), 1), 1)), 1))), 1))), 1)), eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(1, eml(eml(1, eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(eml(1, eml(eml(1, eml(eml(1, eml(eml(1, 1), 1)), eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, 1), 1))), 1)), eml(1, 1)), 1))), 1)), 1)), 1)), 1)), 1)), 1)), 1)), 1)), 1)), 1)), 1)), 1)), 1)), 1)';

const EXPECTED_TAN_EXPR_D2 = `n0: {
  label: "tan"
  shape: circle
}
n1: {
  label: "x"
  shape: rectangle
}

n0 -> n1: "arg"`;

const EXPECTED_LN_PURE_EML_D2 = `n0: {
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

n3 -> n4: "L"
n3 -> n5: "R"
n2 -> n3: "L"
n2 -> n6: "R"
n0 -> n1: "L"
n0 -> n2: "R"`;

test('fixture: tan(x) lowers to the built-in pure eml string', () => {
  expect(toString(toPureEml(parse('tan(x)')))).toBe(EXPECTED_TAN_PURE_EML);
});

test('fixture: tan(x) exports to the built-in d2 expression tree', () => {
  expect(exprToD2(parse('tan(x)'))).toBe(EXPECTED_TAN_EXPR_D2);
});

test('fixture: ln(x) pure eml tree exports to the built-in d2 tree', () => {
  expect(pureEmlTreeToD2(reduceTypes(parse('ln(x)')))).toBe(EXPECTED_LN_PURE_EML_D2);
});
