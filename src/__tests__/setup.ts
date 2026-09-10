/**
 * A canvas 2D context for jsdom, so the charts actually construct under test.
 *
 * jsdom has no canvas and returns null from `getContext`, which makes Chart.js bail out
 * quietly. That is the worst of both worlds: the tests print fifteen lines of "not
 * implemented" noise, and a genuinely broken chart config, a scale id that does not
 * exist or a controller that was never registered, passes anyway because Chart.js never
 * got far enough to complain.
 *
 * Stubbing the handful of methods Chart.js calls is enough to make it build its scales
 * and datasets for real, so a config error becomes a test failure. Nothing here asserts
 * anything about pixels, and it should not: what is under test is the configuration and
 * the surrounding markup, and a canvas is untestable by design.
 *
 * The alternative is the `canvas` npm package, which is a native build with a Cairo
 * dependency. That is a heavy thing to add to a prototype's CI for output nobody looks
 * at.
 */

const context = () =>
  ({
    canvas: { width: 800, height: 240 },
    save: () => {},
    restore: () => {},
    scale: () => {},
    translate: () => {},
    rotate: () => {},
    clearRect: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    bezierCurveTo: () => {},
    quadraticCurveTo: () => {},
    arc: () => {},
    arcTo: () => {},
    rect: () => {},
    ellipse: () => {},
    fill: () => {},
    stroke: () => {},
    clip: () => {},
    fillText: () => {},
    strokeText: () => {},
    setLineDash: () => {},
    getLineDash: () => [],
    setTransform: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createPattern: () => null,
    drawImage: () => {},
    putImageData: () => {},
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    measureText: (text: string) => ({ width: text.length * 6 }),
  }) as unknown as CanvasRenderingContext2D;

/* Setup files run for every suite, and most of this repo's suites are pure node with no
   DOM at all. Touching HTMLCanvasElement there is a ReferenceError, so this is a no-op
   outside jsdom rather than a hard requirement on the environment. */
if (typeof HTMLCanvasElement !== 'undefined') {
  // `getContext` is overloaded per context id, so a single-return stub cannot satisfy
  // the signature without going through `unknown`.
  HTMLCanvasElement.prototype.getContext = (() =>
    context()) as unknown as HTMLCanvasElement['getContext'];

  // Chart.js sizes itself from the parent, which jsdom reports as zero. Without a size
  // it skips layout entirely, which is the other way a bad config escapes notice.
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { value: 800, configurable: true });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    value: 240,
    configurable: true,
  });
}
