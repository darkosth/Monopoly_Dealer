import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { resolveVotingRound } from "@/lib/chameleon/resolveVotingRound";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const { roomCode, hostId, action, payload } = await request.json();

    const session = await prisma.chameleonSession.findUnique({
      where: { roomCode: roomCode.toUpperCase() },
      include: { players: true },
    });

    if (!session) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const host = session.players.find((player) => player.id === hostId && player.isHost);
    if (!host) {
      return NextResponse.json(
        { error: "Unauthorized: Only the host can perform this action" },
        { status: 403 }
      );
    }

    if (action === "CLOSE_ROOM") {
      await prisma.chameleonSession.delete({ where: { roomCode: session.roomCode } });
      return NextResponse.json({ success: true, message: "Room destroyed successfully" });
    }

    if (action === "RESET_SCORES") {
      await prisma.chameleonPlayer.updateMany({
        where: { sessionId: session.id },
        data: { score: 0 },
      });

      return NextResponse.json({ success: true, message: "Scores reset" });
    }

    if (action === "UPDATE_SETTINGS") {
      const { isParticipating, maxVotesAllowed } = payload;

      await prisma.chameleonPlayer.update({
        where: { id: hostId },
        data: { isParticipating },
      });

      if (!isParticipating && session.status === "voting") {
        await prisma.chameleonVote.deleteMany({
          where: {
            sessionId: session.id,
            OR: [{ voterId: hostId }, { votedTargetId: hostId }],
          },
        });
      }

      await prisma.chameleonSession.update({
        where: { id: session.id },
        data: { maxVotesAllowed },
      });

      if (session.status === "voting") {
        await resolveVotingRound(session.id);
      }

      return NextResponse.json({ success: true, message: "Settings saved" });
    }

    if (action === "LEAVE_ROOM") {
      await prisma.chameleonPlayer.update({
        where: { id: hostId },
        data: { isParticipating: false },
      });

      if (session.status === "voting") {
        await prisma.chameleonVote.deleteMany({
          where: {
            sessionId: session.id,
            OR: [{ voterId: hostId }, { votedTargetId: hostId }],
          },
        });

        await resolveVotingRound(session.id);
      }

      return NextResponse.json({ success: true, message: "Host left active play" });
    }

    if (action === "START_VOTING") {
      await prisma.chameleonSession.update({
        where: { id: session.id },
        data: { status: "voting" },
      });
      return NextResponse.json({ success: true, message: "Voting phase started" });
    }

    if (action === "CONTINUE_ROUND") {
      await prisma.chameleonVote.deleteMany({ where: { sessionId: session.id } });
      await prisma.chameleonSession.update({
        where: { id: session.id },
        data: { status: "playing" },
      });
      return NextResponse.json({ success: true, message: "Round continued" });
    }

    if (action === "RETURN_TO_LOBBY") {
      await prisma.chameleonVote.deleteMany({ where: { sessionId: session.id } });
      await prisma.chameleonSession.update({
        where: { id: session.id },
        data: {
          status: "lobby",
          category: null,
          secretWord: null,
          chameleonId: null,
          votesUsed: 0,
        },
      });
      return NextResponse.json({ success: true, message: "Returned to lobby" });
    }

    return NextResponse.json({ error: "Invalid action command" }, { status: 400 });
  } catch (error) {
    console.error("Host action error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
