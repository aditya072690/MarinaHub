import Image from "next/image";

export function BoatGallery({ images, name }: { images: string[]; name: string }) {
  return (
    <div>
      <div className="relative mb-4 aspect-[4/3] overflow-hidden rounded-xl">
        <Image
          src={images[0]!}
          alt={name}
          fill
          className="object-cover"
          priority
        />
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-2">
          {images.slice(1, 5).map((url, i) => (
            <div key={i} className="relative aspect-square overflow-hidden rounded-lg">
              <Image
                src={url}
                alt=""
                fill
                sizes="(max-width: 1024px) 25vw, 150px"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
