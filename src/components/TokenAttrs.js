import React, { Component } from 'react';
import {
  Button,
  Table
} from 'reactstrap';
import {
  Link,
} from 'react-router-dom';
import * as ResolverArtifact from '../contracts/Resolver.json';

const Box = require('3box');

class TokenAttrs extends Component {
  state = {
    box: null,
    web3: null,
    ipfs: null,
    events: [],
    eventsCreated: [],
    minted: [],
    transaction: null,
  }
  constructor(props) {
    super(props);
    this.eventsEmited = this.eventsEmited.bind(this);
  }
  componentDidMount = async function () {
    await this.setState({
      box: this.props.box,
      web3: this.props.web3,
      coinbase: this.props.coinbase,
      ipfs: this.props.ipfs,
      token: this.props.token,
      resolver: this.props.resolver,
      explorer: this.props.explorer
    });

    const events = this.props.events;
    for(const res of events){
      this.eventsEmited(null,res);
    }

    this.props.token.events.allEvents({
      filter: {},
      fromBlock: 'latest'
    },this.eventsEmited);

  }
  eventsEmited =  async function (err, res) {
    if(res){
      const ipfs = this.props.ipfs;
      console.log(res)
      if (res.event = "Minted" && (res.returnValues.from !='0x0000000000000000000000000000000000000000')) {
        try {

            const uri = (await this.props.token.methods.tokenURI(res.returnValues.tokenId).call()).replace("ipfs://ipfs/","");
            console.log(uri);
            const attributes = JSON.parse(await ipfs.cat(uri));
            console.log(attributes)
            const image = attributes.image;
            const breed = attributes.attributes[1].value;
            const birthday = attributes.attributes[2].value;
            const name = attributes.name;
            const obj = {
              uri: uri,
              returnValues: res.returnValues,
              ipfs: {
                name: name,
                image: image,
                breed: breed,
                birthday: birthday
              }
            }
            if(!this.state.events.includes(JSON.stringify(obj))){
              this.state.events.push(JSON.stringify(obj));
              await this.forceUpdate();
              this.state.events = [... new Set(this.state.events)];
              await this.forceUpdate();
            }

        } catch (err) {
          console.log(err);
        }
      }
    }
  }



  render() {
    return (
      <>
        {
          (
            this.state.token &&
            (
              <>
                <h4>Token Info</h4>
                <p>Token Contract Address: <a className='address' href={`${this.state.explorer}/token/${this.state.token.options.address}`} target='_blank'>{this.state.token.options.address}</a></p>
              </>
            )
          )
        }

        {
          (
            (this.state.events.length > 0) &&
            (
              <div style={{paddingTop:'50px'}}>
                <h4>Tokens Minted</h4>
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Breed</th>
                      <th>Birthday</th>
                      <th>Image</th>
                      <th>Uri</th>
                      <th>Info</th>
                    </tr>
                  </thead>
                  <tbody>
                    {
                      this.state.events.map(res => {
                        const event = JSON.parse(res);
                        const name = event.ipfs.name;
                        const uri = event.uri;
                        const image = event.ipfs.image;
                        const breed = event.ipfs.breed;
                        const birthday = event.ipfs.birthday;
                        const id = event.returnValues.tokenId;
                        return (
                            <tr>
                              <td>{id}</td>
                              <td>{name}</td>
                              <td>{breed}</td>
                              <td>{birthday}</td>
                              <td><center><img src={image} style={{ width: '30px' }} /></center></td>
                              <td><a href={`https://ipfs.io/ipfs/${uri.replace('ipfs://ipfs/', '')}`} target='_blank'>{uri}</a></td>
                              <td>
                                <Link to={"/token/"+id} style={{all: 'unset'}}>
                                  <Button color="secondary" onClick={() => {/*that.setToken(id)*/}}>View Info</Button>
                                </Link>
                              </td>
                            </tr>
                        )

                      })
                    }
                  </tbody>
                </Table>
              </div>
            )
          )
        }
      </>
    );
  }

}
export default TokenAttrs;
