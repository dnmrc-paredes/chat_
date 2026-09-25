import "@testing-library/jest-dom"

// jsdom does not implement scrollIntoView, which components call to keep
// scroll containers pinned. Stub it so those effects don't throw.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}
