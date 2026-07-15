import { redirect } from 'next/navigation';

export default function PlaygroundRedirectPage() {
  redirect('/dashboard/playground');
}
