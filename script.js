function modelFetchBeers() {
  fetch("https://punkapi.online/v3/beers?page=1")
    .then((response) => response.json())
    .then((data) => {
      console.log(data);
      data.forEach((beer) => {
        const beerCard = document.createElement("div");
        beerCard.classList.add("card");
        beerCard.innerHTML = `
                <img src="https://punkapi.online/v3/images/${beer.image}" alt="${beer.name}" />
                <h2>${beer.name}</h2>
                <p>${beer.tagline}</p>
                <p>${beer.description}</p>
                <p>ABV: ${beer.abv}</p>
                <p>IBU: ${beer.ibu}</p>
            `;
        document.body.appendChild(beerCard);
      });
    })
    .catch((error) => {
      console.error("Error fetching beers:", error);
    });
}
 
modelFetchBeers();
