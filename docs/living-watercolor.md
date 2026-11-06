# Homepage watercolor cover

Only the homepage opts into the living variant of Banner. The campus JPG is a flat painting; its position, the daylight wash and the transparent mascot form separate 2.5D layers. The original copy, CTAs and scroll seam remain HTML/CSS. No new runtime dependency or external asset request is required.

The optional WebGL chunk draws three curved petal sheets with a procedural pigment shader. A four-quadrant minimum-variance filter runs only on the petals, not on the illustration or DOM. This is a small adaptation of the painterly principle described in [Susurrus](https://tympanus.net/codrops/2026/04/24/susurrus-crafting-a-cozy-watercolor-world-with-three-js-and-shaders/), not a 3D reconstruction of its world. Normal desktop pointer input enables it; narrow screens, touch-only devices and reduced motion skip it. Rendering is capped at about 15 frames per second and 1280 buffer pixels wide. A hidden tab or a section which has scrolled over the sticky cover pauses the draw loop.

Moli is the existing cutout. Its disclosure works with a native summary (Enter/Space, tap); Escape closes and returns focus. Talk to Moli selects the existing studio conversation panel and sends nothing automatically. Independent blinking or limb movement would require approved layered art, a sprite sheet, or a rigged character; none is used here.

Local smoke checks: enable reduced motion and disable WebGL, open and dismiss Moli via keyboard, then test the same links at phone width. In desktop Chrome check pointer parallax, petal draws, and that draws stop when Discover covers the hero. Mobile hardware and Safari should be checked separately before release.
