# Jad Elsaghir

Simple personal portfolio for Jad Elsaghir, an Industrial Engineer and graduate student at the University of Michigan.

## Local development

The site is intentionally dependency-free. Serve the repository root with any static server:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Deployment

GitHub Actions deploys the static site to [sstradingco.github.io/jadelsaghir.github.io](https://sstradingco.github.io/jadelsaghir.github.io/) on pushes to `main`.

For the first deployment, enable GitHub Pages under **Settings → Pages** and choose **GitHub Actions** as the source. Every later push to `main` deploys automatically.