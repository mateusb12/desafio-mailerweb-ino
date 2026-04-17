import asyncio
import logging

from source.core.migrations import run_migrations


def main() -> None:
    run_migrations()
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
        force=True,
    )

    from source.features.outbox.worker_runtime import worker_loop

    asyncio.run(worker_loop())


if __name__ == "__main__":
    main()
