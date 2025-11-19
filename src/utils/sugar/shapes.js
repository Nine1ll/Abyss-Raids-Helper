// src/utils/sugar/shapes.js

const shapes = {};

const register = (key, matrix) => {
  const cells = [];
  for (let r = 0; r < matrix.length; r += 1) {
    for (let c = 0; c < matrix[r].length; c += 1) {
      if (matrix[r][c]) {
        cells.push({ row: r, col: c });
      }
    }
  }

  shapes[key] = {
    key,
    matrix,
    cells,
    height: matrix.length,
    width: matrix[0].length,
    area: cells.length,
  };
};

register("1_dot", [[1]]);

register("2_bar_h", [[1, 1]]);
register("2_bar_v", [[1], [1]]);

register("3_bar_h", [[1, 1, 1]]);
register("3_bar_v", [[1], [1], [1]]);

register("3_L_nw", [
  [1, 0],
  [1, 1],
]);
register("3_L_ne", [
  [0, 1],
  [1, 1],
]);
register("3_L_sw", [
  [1, 1],
  [1, 0],
]);
register("3_L_se", [
  [1, 1],
  [0, 1],
]);

register("4_square", [
  [1, 1],
  [1, 1],
]);

register("4_bar_h", [[1, 1, 1, 1]]);
register("4_bar_v", [[1], [1], [1], [1]]);

register("4_T_up", [
  [0, 1, 0],
  [1, 1, 1],
]);
register("4_T_down", [
  [1, 1, 1],
  [0, 1, 0],
]);
register("4_T_left", [
  [0, 1],
  [1, 1],
  [0, 1],
]);
register("4_T_right", [
  [1, 0],
  [1, 1],
  [1, 0],
]);

register("4_L_tall_sw", [
  [1, 0],
  [1, 0],
  [1, 1],
]);
register("4_L_tall_se", [
  [0, 1],
  [0, 1],
  [1, 1],
]);
register("4_L_tall_nw", [
  [1, 1],
  [0, 1],
  [0, 1],
]);
register("4_L_tall_ne", [
  [1, 1],
  [1, 0],
  [1, 0],
]);

register("4_L_wide_sw", [
  [1, 1, 1],
  [1, 0, 0],
]);
register("4_L_wide_se", [
  [1, 1, 1],
  [0, 0, 1],
]);
register("4_L_wide_nw", [
  [1, 0, 0],
  [1, 1, 1],
]);
register("4_L_wide_ne", [
  [0, 0, 1],
  [1, 1, 1],
]);

register("5_plus", [
  [0, 1, 0],
  [1, 1, 1],
  [0, 1, 0],
]);

register("5_N_nw", [
  [0, 1, 1],
  [0, 1, 0],
  [1, 1, 0],
]);
register("5_N_ne", [
  [1, 1, 0],
  [0, 1, 0],
  [0, 1, 1],
]);
register("5_N_sw", [
  [1, 0, 0],
  [1, 1, 1],
  [0, 0, 1],
]);
register("5_N_se", [
  [0, 0, 1],
  [1, 1, 1],
  [1, 0, 0],
]);

register("5_L_up", [
  [1, 1, 1],
  [1, 0, 0],
  [1, 0, 0],
]);
register("5_L_right", [
  [1, 1, 1],
  [0, 0, 1],
  [0, 0, 1],
]);
register("5_L_down", [
  [1, 0, 0],
  [1, 0, 0],
  [1, 1, 1],
]);
register("5_L_left", [
  [0, 0, 1],
  [0, 0, 1],
  [1, 1, 1],
]);

register("5_T_up", [
  [1, 1, 1],
  [0, 1, 0],
  [0, 1, 0],
]);
register("5_T_right", [
  [0, 0, 1],
  [1, 1, 1],
  [0, 0, 1],
]);
register("5_T_down", [
  [0, 1, 0],
  [0, 1, 0],
  [1, 1, 1],
]);
register("5_T_left", [
  [1, 0, 0],
  [1, 1, 1],
  [1, 0, 0],
]);

register("5_U_down", [
  [1, 0, 1],
  [1, 1, 1],
]);
register("5_U_up", [
  [1, 1, 1],
  [1, 0, 1],
]);
register("5_U_left", [
  [1, 1],
  [0, 1],
  [1, 1],
]);
register("5_U_right", [
  [1, 1],
  [1, 0],
  [1, 1],
]);

// 8칸 모양들 (유니크 등급용)
register("8_snake_v", [
  [1, 0],
  [1, 1],
  [1, 1],
  [1, 1],
  [0, 1],
]);

register("8_snake_h", [
  [0, 1, 1, 1, 1],
  [1, 1, 1, 1, 0],
]);

register("8_rect_v", [
  [1, 1],
  [1, 1],
  [1, 1],
  [1, 1],
]);
register("8_rect_h", [
  [1, 1, 1, 1],
  [1, 1, 1, 1],
]);

register("8_plus_big", [
  [0, 1, 0],
  [1, 1, 1],
  [1, 1, 1],
  [0, 1, 0],
]);

register("8_ring_h", [
  [0, 1, 1, 0],
  [1, 1, 1, 1],
  [0, 1, 1, 0],
]);

register("8_T_up", [
  [1, 1, 1, 1],
  [0, 1, 1, 0],
  [0, 1, 1, 0],
]);

register("8_T_down", [
  [0, 1, 1, 0],
  [0, 1, 1, 0],
  [1, 1, 1, 1],
]);

export const sugarShapes = shapes;
export const SHAPE_OPTIONS = Object.values(shapes).map((shape) => ({
  key: shape.key,
  label: `${shape.key} (${shape.area}칸)`,
  area: shape.area,
  matrix: shape.matrix,
  width: shape.width,
  height: shape.height,
}));