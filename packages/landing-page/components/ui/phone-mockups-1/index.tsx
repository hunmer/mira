import {
  type ImageItem,
  PhoneCarousel,
} from "@/components/ui/phone-mockups-1-utils/phone-carousel";

const exampleImages: ImageItem[] = [
  {
    src: "/mobile_screenshots/home.jpg",
    alt: "Mira home screen on iPhone",
  },
  {
    src: "/mobile_screenshots/preview.jpg",
    alt: "Mira preview screen on iPhone",
  },
  {
    src: "/mobile_screenshots/settings.jpg",
    alt: "Mira settings screen on iPhone",
  },
];

export default function PhoneMockupBasic() {
  return <PhoneCarousel images={exampleImages} />;
}
