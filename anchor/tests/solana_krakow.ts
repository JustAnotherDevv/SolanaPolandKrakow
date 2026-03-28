import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaKrakow } from "../target/types/solana_krakow";
import { Keypair, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";

describe("solana_krakow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SolanaKrakow as Program<SolanaKrakow>;
  const counter = Keypair.generate();

  it("Initializes the counter", async () => {
    await program.methods
      .initialize()
      .accounts({
        counter: counter.publicKey,
        authority: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([counter])
      .rpc();

    const account = await program.account.counter.fetch(counter.publicKey);
    assert.ok(account.count.toNumber() === 0);
    assert.ok(account.authority.equals(provider.wallet.publicKey));
  });

  it("Increments the counter", async () => {
    await program.methods
      .increment()
      .accounts({
        counter: counter.publicKey,
        authority: provider.wallet.publicKey,
      })
      .rpc();

    const account = await program.account.counter.fetch(counter.publicKey);
    assert.ok(account.count.toNumber() === 1);
  });
});
