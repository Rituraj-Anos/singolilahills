// An <img> that asks the image host for the size the screen needs instead of one huge file.
// Works for Unsplash links (the width is part of the URL). Any other link is used as given.
const WIDTHS = [400, 640, 900, 1280, 1800];

function at(url, w) {
  return url.replace(/([?&])w=\d+/, `$1w=${w}`);
}

export function imageSet(url) {
  if (typeof url !== 'string' || !/^https:\/\/images\.unsplash\.com\//.test(url) || !/[?&]w=\d+/.test(url)) return null;
  return {
    src: at(url, 900),
    srcSet: WIDTHS.map((w) => `${at(url, w)} ${w}w`).join(', '),
  };
}

export default function Pic({ src, sizes = '100vw', alt = '', ...rest }) {
  const set = imageSet(src);
  // eslint-disable-next-line @next/next/no-img-element
  return set ? <img src={set.src} srcSet={set.srcSet} sizes={sizes} alt={alt} {...rest} /> : <img src={src} alt={alt} {...rest} />;
}
