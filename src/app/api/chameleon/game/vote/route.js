// src/app/api/chameleon/game/vote/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { resolveVotingRound } from "@/lib/chameleon/resolveVotingRound";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const { roomCode, voterId, votedTargetId } = await request.json();

    const session = await prisma.chameleonSession.findUnique({
      where: { roomCode: roomCode.toUpperCase() },
      include: { players: true, votes: true },
    });

    if (!session) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const activePlayers = session.players.filter((player) => player.isParticipating);
    const voter = activePlayers.find((player) => player.id === voterId);
    const votedTarget = activePlayers.find((player) => player.id === votedTargetId);

    if (!voter) {
      return NextResponse.json({ error: "You are not an active player" }, { status: 403 });
    }

    if (!votedTarget) {
      return NextResponse.json({ error: "Target player is no longer active" }, { status: 400 });
    }

    if (session.votes.some((vote) => vote.voterId === voterId)) {
      return NextResponse.json({ error: "You already voted" }, { status: 400 });
    }

    await prisma.chameleonVote.create({
      data: {
        sessionId: session.id,
        voterId,
        votedTargetId,
      },
    });

    await resolveVotingRound(session.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing vote:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
