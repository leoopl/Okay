import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

export function ProfileTab() {
  return (
    <div className="space-y-4">
      <h3 className="mb-4 text-xl font-semibold">Profile Details</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" defaultValue="John" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" defaultValue="Doe" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" defaultValue="john@example.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Input id="role" defaultValue="Product Designer" readOnly />
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button variant="default">Save Changes</Button>
      </div>
    </div>
  );
}
