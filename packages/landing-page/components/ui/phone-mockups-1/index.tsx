import {
  type ImageItem,
  PhoneCarousel,
} from "@/components/ui/phone-mockups-1-utils/phone-carousel";
import { withBasePath } from "@/lib/asset";

const exampleImages: ImageItem[] = [
  {
    src: withBasePath("/mobile_screenshots/home.jpg"),
    alt: "Mira home screen on iPhone",
  },
  {
    src: withBasePath("/mobile_screenshots/preview.jpg"),
    alt: "Mira preview screen on iPhone",
  },
  {
    src: withBasePath("/mobile_screenshots/settings.jpg"),
    alt: "Mira settings screen on iPhone",
  },
];

export default function PhoneMockupBasic() {
  return <PhoneCarousel images={exampleImages} />;
}
