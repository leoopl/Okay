// import { MoveRight } from 'lucide-react';
// import { Button } from '@/components/ui/button';

const Blog1 = () => (
  <div className="w-full py-20 lg:py-40">
    <div className="container mx-auto flex flex-col gap-14">
      <div className="flex w-full flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
        <h4 className="max-w-xl font-varela text-3xl tracking-tighter md:text-5xl">
          Latest articles
        </h4>
        {/* <Button className="gap-4">
          View all articles <MoveRight className="size-4" />
        </Button> */}
      </div>
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex cursor-pointer flex-col gap-2 hover:opacity-75">
          <div className="mb-4 aspect-video rounded-md bg-muted"></div>
          <h3 className="text-xl tracking-tight">Pay supplier invoices</h3>
          <p className="text-base text-muted-foreground">
            Our goal is to streamline SMB trade, making it easier and faster than ever.
          </p>
        </div>
        <div className="flex cursor-pointer flex-col gap-2 hover:opacity-75">
          <div className="mb-4 aspect-video rounded-md bg-muted"></div>
          <h3 className="text-xl tracking-tight">Pay supplier invoices</h3>
          <p className="text-base text-muted-foreground">
            Our goal is to streamline SMB trade, making it easier and faster than ever.
          </p>
        </div>
        <div className="flex cursor-pointer flex-col gap-2 hover:opacity-75">
          <div className="mb-4 aspect-video rounded-md bg-muted"></div>
          <h3 className="text-xl tracking-tight">Pay supplier invoices</h3>
          <p className="text-base text-muted-foreground">
            Our goal is to streamline SMB trade, making it easier and faster than ever.
          </p>
        </div>
        <div className="flex cursor-pointer flex-col gap-2 hover:opacity-75">
          <div className="mb-4 aspect-video rounded-md bg-muted"></div>
          <h3 className="text-xl tracking-tight">Pay supplier invoices</h3>
          <p className="text-base text-muted-foreground">
            Our goal is to streamline SMB trade, making it easier and faster than ever.
          </p>
        </div>
      </div>
    </div>
  </div>
);

export default Blog1;
