import { render, screen } from "@testing-library/react";
import App from "./App";
import { ThemeProvider } from "./context/ThemeContext";

test("renders both simulators", () => {
  render(
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
  expect(screen.getByText(/시즈나이트 시뮬레이터/)).toBeInTheDocument();
  expect(screen.getByText(/설탕 유리 배치 도우미/)).toBeInTheDocument();
});
