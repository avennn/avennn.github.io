/**
 * Set up image popup
 * 由原来的Magnific-Popup改成viewerjs
 * See: https://github.com/fengyuanchen/viewerjs
 */

export function imgPopup() {
  if ($('.popup') <= 0) {
    return;
  }

  $('.popup').on('click', function (e) {
    e.preventDefault();

    const imgs = $(this).children('img');
    if (imgs) {
      const viewer = new Viewer(imgs[0], {
        title: false,
        navbar: false,
        focus: true,
        toolbar: {
          zoomIn: 4,
          zoomOut: 4,
        },
        hidden() {
          viewer.destroy();
        },
      });
      viewer.show();
    }
  });
}
