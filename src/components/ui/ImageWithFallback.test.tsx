import { fireEvent, render, screen } from "@testing-library/react";
import ImageWithFallback from "./ImageWithFallback";

describe("ImageWithFallback", () => {
  it("switches to fallback source when image loading fails", () => {
    render(
      <ImageWithFallback
        src="/not-found.png"
        fallbackSrc="/placeholder.svg"
        alt="test image"
      />,
    );

    const image = screen.getByRole("img", { name: "test image" }) as HTMLImageElement;
    expect(image.src).toContain("/not-found.png");

    fireEvent.error(image);
    expect(image.src).toContain("/placeholder.svg");
  });
});
