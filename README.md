# WeberQ Global website

![WeberQ logo](assets/icons/logo-96.png)

The site at [weberq.in](https://weberq.in) for **WeberQ Global Private Limited**, Hyderabad:
PCB design, enclosure and product design, and software.

It is plain HTML, CSS and JavaScript with no dependencies and no build step. GitHub Pages
serves it from the root of `main`.

## Layout

```
index.html              the home page, all its content
assets/css/site.css     every style, including the status pages
assets/js/board.js      the demo PCB, as data, and its SVG renderer
assets/js/site.js       nav, hero viewport, board-to-box sequence, scope console, brief form
assets/fonts/           Space Grotesk, Inter and JetBrains Mono, self-hosted
assets/icons/           logo sizes, favicon and the social share image
assets/work/            screenshots of real work
404.html                the page GitHub Pages serves for a missing URL
this-*.html             error pages for Apache hosting, named in .htaccess
thankyou.html           plain confirmation page
externals/cashiflow/    Cashi Flow privacy policy. Its URL must not change.
```

## Run it locally

Serve the folder from its root, so the absolute paths on the status pages resolve:

```bash
python3 -m http.server 8080
```

## Things to know before editing

- **Keep the content real.** Client names, numbers and screenshots on this site are checkable.
  Do not add a claim that cannot be backed up, and do not show client designs without
  permission. The board in the hero and the scroll sequence is artwork made for this site.
- **The demo board is laid out by PCB rules.** If you change `assets/js/board.js`, tracks of
  different nets must not touch on the same layer.
- **The brief form has no backend.** GitHub Pages cannot receive a form, so the form opens the
  visitor's email app, addressed to `samachar@weberq.in`, with Gmail and copy fallbacks.
- **Motion is optional.** With reduced motion, or on a screen too short to pin, the
  board-to-box sequence becomes a plain list beside the finished box.

## Contact

WeberQ Global Private Limited, Hyderabad, India
[samachar@weberq.in](mailto:samachar@weberq.in)

## License

This repository is © 2025 **WeberQ Global Pvt Ltd**.
Source code is available under the **MIT License**, unless stated otherwise.
Content, logos and brand assets are proprietary to WeberQ Global.
