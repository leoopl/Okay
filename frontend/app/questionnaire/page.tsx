import Image from 'next/image';

export default function Questionnaire() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
        <div className="animate-fade-in flex flex-col gap-8 text-center">
          <h1 className="font-varela small-caps text-green-dark mb-4 text-center text-4xl leading-9 font-bold tracking-tight">
            Técnicas de Respiração
          </h1>
          <p className="text-base text-gray-700">
            Pratique técnicas de respiração comuns para reduzir o estresse e manter a calma.
          </p>
          {/* <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {data.map((item) => (
              <button
                key={item.id}
                className="relative flex cursor-pointer flex-col items-center justify-center rounded-lg px-6 py-5 shadow transition-transform duration-300 hover:-translate-y-1 hover:shadow-md"
                style={{ backgroundColor: item.bgcolor }}
                onClick={() => openModal(item)}
              >
                <h3 className="text-lg font-medium text-gray-900">{item.name}</h3>
                <span className="mt-2 text-sm text-gray-700">Clique para ver</span>
              </button>
            ))}
          </div> */}
        </div>

        <div className="flex justify-center">
          <Image
            src="/questionnaire.svg"
            alt="Brain with flowers"
            width={500}
            height={500}
            className="mx-auto"
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            // placeholder="blur" Add placeholder for non-SVG images
            // blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAEtgJyBzPZIQAAAABJRU5ErkJggg=="
          />
        </div>
      </div>
    </div>
  );
}
