import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { MapPin } from "lucide-react";

interface ListingCardProps {
  id: number;
  title: string;
  price: number;
  imageSrc: string | null;
  location: string;
  category: string;
}

export function ListingCard({ id, title, price, imageSrc, location, category }: ListingCardProps) {
  return (
    <Link href={`/listings/${id}`}>
      <Card className="h-full overflow-hidden hover:shadow-lg transition-shadow duration-200 cursor-pointer group">
        <div className="relative aspect-square w-full overflow-hidden bg-muted">
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Brak zdjęcia
            </div>
          )}
        </div>
        <CardHeader className="p-4 pb-2">
          <div className="flex justify-between items-start gap-2">
            <h3 className="font-semibold text-lg line-clamp-1">{title}</h3>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-1">{category}</p>
        </CardHeader>
        <CardContent className="p-4 pt-0 pb-2">
          <p className="font-bold text-xl">{price.toFixed(2)} zł</p>
        </CardContent>
        <CardFooter className="p-4 pt-0">
          <div className="flex items-center text-sm text-muted-foreground">
            <MapPin className="mr-1 h-3 w-3" />
            <span className="line-clamp-1">{location}</span>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
