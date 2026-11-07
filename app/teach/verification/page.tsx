"use client";
import Link from "next/link";
import {useSession} from "@/lib/platform/useSession";
import AdultReview from "@/components/creator/AdultReview";
import "@/components/platform/platform.css";
export default function Page(){
 const user=useSession();
 return <main className="pv"><Link href="/teach/creator/">← Creator Moli</Link><h1>Adult verification desk</h1><p>This role can review adult eligibility only. It does not grant course publication privileges. Reviewers cannot verify themselves.</p>{user===undefined?<p role="status">Checking reviewer access…</p>:user?.app_metadata?.creator_age_reviewer===true||user?.app_metadata?.moli_admin===true?<AdultReview uid={user.id}/>:<p>This desk is available to appointed reviewers. <Link href="/account/?mode=login">Sign in</Link> or contact support.</p>}</main>;
}
